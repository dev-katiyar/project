
import { EntityValidationErrors } from '../../models/app-error';
import { ValidationErrorDto } from './dto/validation-error-dto';

/**
 * Mapper of DTO to domain model.
 */
export interface IMapperFromDto<TDto, TDomain> {
  /**
   * Maps from DTO to Domain model.
   */
  fromDto(data: TDto): TDomain;
}

/**
 * Mapper of domain model to DTO.
 */
export interface IMapperToDto<TDto, TDomain> {
  /**
   * Maps from Domain to DTO model.
   */
  toDto(data: TDomain): TDto;
}

/**
 * Mapper of errors of DTO to domain model errors.
 */
export interface IValidationErrorMapper<TDto, TDomain> {
  /**
   * Map validation error DTO to error for domain model.
   * @param errorDto Error DTO.
   */
  validationErrorFromDto(errorDto: ValidationErrorDto<TDto>): EntityValidationErrors<TDomain>;
}

/**
 * Mapper of DTO to domain model with errors mapping support.
 */
export interface IMapperFromDtoWithErrors<TDto, TDomain> extends IMapperFromDto<TDto, TDomain>, IValidationErrorMapper<TDto, TDomain> {
}

/**
 * Mapper of domain model to DTO with errors mapping support.
 */
export interface IMapperToDtoWithErrors<TDto, TDomain> extends IMapperToDto<TDto, TDomain>, IValidationErrorMapper<TDto, TDomain> {
}

/**
 * Mapper from DTO to Domain model and vice versa.
 */
export interface IMapper<TDto, TDomain> extends IMapperFromDto<TDto, TDomain>, IMapperToDto<TDto, TDomain> {
}

/**
 * Mapper of DTO to domain model and vice versa with errors mapping support.
 */
export interface IMapperWithErrors<TDto, TDomain> extends IMapperFromDtoWithErrors<TDto, TDomain>, IMapperToDtoWithErrors<TDto, TDomain> {
}

/**
 * Mapper of DTO to domain model with getConstructorData method for inheritance
 */
export interface IMapperFromDtoExtendable<TDto, TDomain> extends IMapperFromDto<TDto, TDomain> {
  /**
   * Convert DTO to Model constructor data
   */
  getConstructorData(data: TDto): Partial<TDomain>;
}

/**
 * Mapper from DTO to Domain model and vice versa which support extending
 */
export interface IMapperExtendable<TDto, TDomain> extends IMapperFromDtoExtendable<TDto, TDomain>, IMapperToDto<TDto, TDomain> {
}
