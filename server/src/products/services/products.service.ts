import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDocument } from 'src/users/schemas/user.schema';
import { Product, ProductDocument, ProductStatus } from '../schemas/product.schema';
import { PaginatedResponse } from '@/types';
import { Order } from '../../orders/schemas/order.schema';
import { sampleProduct } from '@/utils/data/product';
import { Role } from '@/types/role.enum';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
  ) { }

  async findTopRated(): Promise<ProductDocument[]> {
    const products = await this.productModel
      .find({})
      .sort({ rating: -1 })
      .limit(3);

    if (!products.length) throw new NotFoundException('No products found.');

    return products;
  }

  async findMany(
    keyword?: string,
    page?: string,
    limit?: string,
    user?: UserDocument,
    status?: ProductStatus,
    brand?: string,
  ): Promise<PaginatedResponse<Product>> {
    const pageSize = parseInt(limit ?? '10');
    const currentPage = parseInt(page ?? '1');

    const decodedKeyword = keyword ? decodeURIComponent(keyword) : '';

    const searchPattern = decodedKeyword
      ? decodedKeyword
        .split(' ')
        .map((term) => `(?=.*${term})`)
        .join('')
      : '';

    const searchQuery = decodedKeyword
      ? {
        $and: [
          {
            $or: [
              { name: { $regex: searchPattern, $options: 'i' } },
              { description: { $regex: searchPattern, $options: 'i' } },
              { brand: { $regex: searchPattern, $options: 'i' } },
              { category: { $regex: searchPattern, $options: 'i' } },
            ],
          },
          user ? { user: user._id } : {},
          brand ? { brand: brand } : {},
        ]
      }
      : {
        ...( user ? { user: user._id } : {} ),
        ...( brand ? { brand: brand } : {} ),
      };

    const searchQueryWithStatus = {
      ...searchQuery,
      ...(status && { status }),
    };

    const count = await this.productModel.countDocuments(searchQueryWithStatus);
    const products = await this.productModel
      .find(searchQueryWithStatus)
      .populate({
        path: 'user',
        select: 'name email phoneNumber seller',
      })
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (currentPage - 1));

    if (!products.length) throw new NotFoundException('No products found.');

    return {
      items: products,
      total: count,
      page: currentPage,
      pages: Math.ceil(count / pageSize),
    };
  }

  async findById(id: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product ID.');

    const product = await this.productModel.findById(id);

    if (!product) throw new NotFoundException('No product with given ID.');

    return product;
  }

  async createMany(products: Partial<Product>[]): Promise<ProductDocument[]> {
    const createdProducts = await this.productModel.insertMany(products);

    return createdProducts as unknown as ProductDocument[];
  }

  async createSample(): Promise<ProductDocument> {
    const createdProduct = await this.productModel.create(sampleProduct);

    return createdProduct;
  }

  async update(id: string, attrs: Partial<Product>): Promise<ProductDocument> {
    const {
      name,
      price,
      description,
      images,
      brandLogo,
      brand,
      category,
      countInStock,
      status,
      deliveryType,
      minDeliveryDays,
      maxDeliveryDays,
    } = attrs;

    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product ID.');

    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('No product with given ID.');

    product.name = name ?? product.name;
    product.price = price ?? product.price;
    product.description = description ?? product.description;
    product.images = images ?? product.images;
    product.brandLogo = brandLogo ?? product.brandLogo;
    product.brand = brand ?? product.brand;
    product.category = category ?? product.category;
    product.countInStock = countInStock ?? product.countInStock;
    product.deliveryType = deliveryType ?? product.deliveryType;
    product.minDeliveryDays = minDeliveryDays ?? product.minDeliveryDays;
    product.maxDeliveryDays = maxDeliveryDays ?? product.maxDeliveryDays;
    
    // სტატუსის განახლება
    product.status = status ?? product.status;

    return product.save();
  }

  async updateStatus(
    id: string,
    status: ProductStatus,
    rejectionReason?: string
  ): Promise<ProductDocument> {
    const product = await this.findById(id);
    
    product.status = status;
    if (rejectionReason) {
      product.rejectionReason = rejectionReason;
    }
    
    return product.save();
  }

  async findByStatus(status: ProductStatus): Promise<ProductDocument[]> {
    return this.productModel
      .find({ status })
      .populate({
        path: 'user',
        select: 'name email phoneNumber seller',
      })
      .exec();
  }

  async createReview(
    id: string,
    user: UserDocument,
    rating: number,
    comment: string,
  ): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product ID.');

    const product = await this.productModel.findById(id);

    if (!product) throw new NotFoundException('No product with given ID.');

    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === user._id.toString(),
    );

    if (alreadyReviewed)
      throw new BadRequestException('Product already reviewed!');

    const hasPurchased = await this.orderModel.findOne({
      user: user._id,
      'orderItems.productId': id,
      status: 'delivered',
    });

    if (!hasPurchased)
      throw new BadRequestException(
        'You can only review products you have purchased',
      );

    const review = {
      name: user.name,
      rating,
      comment,
      user,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    product.reviews.push(review);

    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    product.numReviews = product.reviews.length;

    const updatedProduct = await product.save();

    return updatedProduct;
  }

  async deleteOne(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product ID.');

    const product = await this.productModel.findById(id);

    if (!product) throw new NotFoundException('No product with given ID.');

    await product.deleteOne();
  }

  async deleteMany(): Promise<void> {
    await this.productModel.deleteMany({});
  }

  async create(productData: Partial<Product>): Promise<ProductDocument> {
    const status = productData.user.role === Role.Admin 
      ? ProductStatus.APPROVED 
      : ProductStatus.PENDING;

    const product = await this.productModel.create({
      ...productData,
      status,
      rating: 0,
      numReviews: 0,
      reviews: [],
    });

    return product;
  }
}